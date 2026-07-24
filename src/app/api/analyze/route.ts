import { NextResponse } from 'next/server';

const RETIRED_RESPONSE = {
  error: 'This analysis endpoint has been retired.',
  code: 'ENDPOINT_RETIRED',
};

function retiredEndpointResponse() {
  return NextResponse.json(RETIRED_RESPONSE, {
    status: 410,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = retiredEndpointResponse;
export const POST = retiredEndpointResponse;
