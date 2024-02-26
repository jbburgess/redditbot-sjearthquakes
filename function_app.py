import datetime
import gc
import logging
import os
import sys

import azure.functions as func
from bs4 import BeautifulSoup
import praw
import requests

# Initialize global variables.
BASE_URL = os.environ["NewsSite_BaseURL"]
NEWS_URL = BASE_URL + os.environ["NewsSite_NewsURL"]
MAX_ARTICLES = int(os.environ["NewsSite_MaxArticles"])
CUTOFF_DAYS = int(os.environ["NewsSite_ArticleCutoffDays"])

USER_AGENT = os.environ["Reddit_Connection_UserAgent"]
CLIENT_ID = os.environ["Reddit_Connection_ClientID"]
CLIENT_SECRET = os.environ["Reddit_Connection_ClientSecret"]
USERNAME = os.environ["Reddit_Connection_Username"]
PASSWORD = os.environ["Reddit_Connection_Password"]

FLAIR_ID = os.environ["Reddit_Submission_News_FlairID"]
RESUBMIT = os.environ["Reddit_Submission_Resubmit"]
SEND_REPLIES = os.environ["Reddit_Submission_SendReplies"]

SUBREDDIT = os.environ["Reddit_Subreddit"]

app = func.FunctionApp()

@app.schedule(schedule="0 */5 0-3,14-23 * * *", arg_name="timer", run_on_startup=True,
              use_monitor=False)
def post_news(timer: func.TimerRequest) -> None:
    utc_timestamp = datetime.datetime.utcnow().replace(
        tzinfo=datetime.timezone.utc).isoformat()

    logging.debug('Python timer trigger function ran at %s', utc_timestamp)
    cutoffutc = datetime.datetime.utcnow() - datetime.timedelta(days = CUTOFF_DAYS)

    #Retrieve new articles from Earthquakes website.
    articles = get_newsarticles()

    # Connect to subreddit if new articles were found.
    if articles:
        try:
            reddit = praw.Reddit(
                user_agent = USER_AGENT,
                client_id = CLIENT_ID,
                client_secret = CLIENT_SECRET,
                username = USERNAME,
                password = PASSWORD,
            )

            subreddit = reddit.subreddit(SUBREDDIT)
        except:
            logging.error('Unexpected error when initializing reddit connection:%s', sys.exc_info()[0])
            raise

        # Retrieve recent posts in subreddit
        subreddit_urls = []

        try:
            logging.debug('Retrieving subreddit posts.')

            for submission in subreddit.new(limit=50):
                normalized_url = submission.url.lower()
                subreddit_urls.append(normalized_url)
        except:
            logging.error('Unexpected error when retrieving subreddit posts:%s', sys.exc_info()[0])
            raise

        # Retrieve removed links in subreddit
        removed_urls = []

        try:
            logging.debug('Retrieving removed subreddit links.')

            for log in subreddit.mod.log(action='removelink',limit=20):
                actiontimestamp = datetime.datetime.utcfromtimestamp(log.created_utc)
                if actiontimestamp < cutoffutc:
                    logging.debug('Removal action is old, skipping: %s', log.target_title)
                else:
                    submission = reddit.submission(log.target_fullname.lstrip('t3_'))
                    normalized_url = submission.url.lower()
                    removed_urls.append(normalized_url)
                    logging.debug('Link added: %s', submission.url)
        except:
            logging.error('Unexpected error when retrieving removed subreddit links:%s', sys.exc_info()[0])
            raise

        # Process each article.
        if subreddit_urls:
            for article in articles:
                # Skip article already posted to subreddit.
                if article['link'] in subreddit_urls:
                    logging.debug('Article already posted, skipping: %s', article['title'])
                else:
                    # Skip article if it was already posted and then removed by mods.
                    if article['link'] in removed_urls:
                        logging.info('Article already posted and then removed by mods, skipping: %s', article['title'])
                    else:
                        # Build submission parameter splat.
                        submit_params = {
                            'title': article['title'],
                            'url': article['link'],
                            'flair_id': FLAIR_ID,
                            'resubmit': RESUBMIT,
                            'send_replies': SEND_REPLIES
                        }

                        # Submit new post to subreddit.
                        try:
                            subreddit.submit(**submit_params)
                        except praw.exceptions.RedditAPIException as exception:
                            for subexception in exception.items:
                                if subexception.error_type == 'ALREADY_SUB':
                                    logging.critical(f'Error encountered when posting article ({article["title"]}): Article has already been posted, but was not caught by list comparison.')
                                    raise
                                else:
                                    logging.error(f'Unexpected Reddit API error encountered when posting article ({article["title"]}): {subexception.error_type}, {subexception.message}')
                                    raise
                        except:
                            logging.error(f'Unexpected error when posting article ({article["title"]}): {sys.exc_info()[0]}')
                            raise
                        else:
                            logging.info('New article successfully posted: %s', article['title'])
            del subreddit_urls
            del removed_urls
        else:
            logging.warning('No subreddit post URLs retrieved.')

        del articles
    else:
        logging.info('No new articles retrieved from news site.')

    # Sleep for configured interval before checking for news again.
    gc.collect()

def get_newsarticles():
    # Retrieve Earthquakes website news page and parse text articles.
    headers = {"User-Agent": "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.2.8) Gecko/20100722 Firefox/3.6.8 GTB7.1 (.NET CLR 3.5.30729)", "Referer": "http://example.com"}
    page = requests.get(NEWS_URL, headers=headers, timeout=5)
    soup = BeautifulSoup(page.content, 'html.parser')
    results = soup.find("section", class_='d3-l-grid--outer d3-l-section-row')
    article_elems = results.find_all("div", class_='d3-l-col__col-3')

    if article_elems:
        cutoffutcutc = datetime.datetime.utcnow() - datetime.timedelta(days = CUTOFF_DAYS)
        articles = []

        for article_elem in article_elems[:MAX_ARTICLES]:
            # Parse article information.
            title = article_elem.a['title']
            href = article_elem.a['href']
            link = BASE_URL + href

            # If article is a "NEWS:" post and not a duplicate, add to articles array.
            if "NEWS: " in title:
                if link in [i['link'] for i in articles]:
                    logging.debug('Duplicate article skipped: %s', title)
                else:
                    # Retrieve timestamp from article page.
                    articlepage = requests.get(link, timeout = 10)
                    articlesoup = BeautifulSoup(articlepage.content, 'html.parser')
                    timestamp_elem = articlesoup.find('div', class_='oc-c-article__date')
                    timestamp = timestamp_elem.p['data-datetime']
                    articledate = datetime.datetime.strptime(timestamp, '%m/%d/%Y %H:%M:%S')

                    if articledate < cutoffutcutc:
                        logging.debug('Old article skipped: %s', title)
                    else:
                        article = {
                            'title': title,
                            'link': link,
                            'timestamp': timestamp
                        }
                        articles.append(article)
                        logging.info('Article added: %s', title)
            else:
                logging.debug('Non-news article skipped: %s', title)

        del article_elems
    else:
        logging.critical('No article elements found on news site.')

    del page
    del soup
    del results

    return articles
