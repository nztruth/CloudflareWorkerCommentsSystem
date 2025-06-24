import { useSearchParams } from 'react-router-dom';

export enum ErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN'
}

function ErrorPage() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('code') as ErrorCode | null;

  const info = (() => {
    switch (errorCode) {
      case ErrorCode.INVALID_TOKEN:
        return <div>Invalid Token</div>
      default:
        return <div>Something went wrong</div>
    }
  })()

  return (
    <>
      {info}
    </>
  )
}

export default ErrorPage