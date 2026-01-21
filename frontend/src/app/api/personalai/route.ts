import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/personalai/authorize';
  url.search = '';
  return NextResponse.redirect(url);
}
