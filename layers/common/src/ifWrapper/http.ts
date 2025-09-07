// layers/common/src/http.ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpError, isHttpError, internal, type ErrorPayload } from '../errors';

const allowOrigin = process.env.ALLOW_ORIGIN ?? '*';
const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Credentials': 'true',
};

export const json = (statusCode: number, body: unknown, headers: Record<string, string> = {}): APIGatewayProxyResult => ({
  statusCode,
  headers: { ...baseHeaders, ...headers },
  body: JSON.stringify(body),
});

export const ok = (body: unknown, headers?: Record<string, string>) => json(200, body, headers);
export const created = (body: unknown, location?: string, headers?: Record<string, string>) => {
  const extraHeaders: Record<string, string> = {};
  if (location) {
    extraHeaders["Location"] = location;
  }
  return json(201, body, { ...headers, ...extraHeaders });
};
export const noContent = (headers?: Record<string, string>) => ({ statusCode: 204, headers: { ...baseHeaders, ...headers }, body: '' });

export const errorResponse = (err: HttpError, requestId?: string): APIGatewayProxyResult => {
  const payload: ErrorPayload & { requestId?: string } = {
    code: err.code,
    message: err.message,
    ...(err.details ? { details: err.details } : {}),
    ...(requestId ? { requestId } : {}),
  };
  return json(err.status, payload);
};

// Lambda 用ラッパ（try/catch & ロギング & エラーマップ）
export const wrap =
  (fn: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult | unknown>) =>
  async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const rid = (event as any)?.requestContext?.requestId || context.awsRequestId;
    try {
      const out = await fn(event, context);
      // ハンドラが素の値を返したら 200 に包む
      if (out && typeof out === 'object' && 'statusCode' in (out as any)) return out as APIGatewayProxyResult;
      return ok(out ?? {});
    } catch (e: any) {
      console.log("e",e)
      console.log("isHttpError(e)",isHttpError(e),typeof e)
      const err = isHttpError(e) ? e : internal('Unhandled error', process.env.NODE_ENV === 'development' ? { error: String(e) } : undefined, e);
      console.error('ERROR', { requestId: rid, status: err.status, code: err.code, message: err.message, details: err.details, stack: e?.stack });
      return errorResponse(err, rid);
    }
  };