import type { Request, Response } from 'express';

/** Express request with `unknown` bodies to require explicit typing at call sites. */
export type HttpReq<ReqBody = unknown, RspBody = unknown> = Request<
  Record<string, string>,
  RspBody,
  ReqBody
>;

/** Express response with `unknown` body to require explicit typing at call sites. */
export type HttpRsp<RspBody = unknown> = Response<RspBody>;
