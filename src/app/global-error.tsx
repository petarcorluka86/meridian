'use client';

/**
 * The last resort: an error in the root layout itself, where none of the app's
 * own styles or components are available. Deliberately plain and self-contained
 * — a fallback that depends on the thing that just broke is not a fallback.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '48px 32px',
          background: '#f2f0ec',
          color: '#3d3a36',
          font: '400 15px/1.6 system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ font: '650 22px/1.3 system-ui, sans-serif', margin: '0 0 12px' }}>
            Meridian could not start this page.
          </h1>
          <p style={{ margin: '0 0 16px' }}>
            Your vault is a folder of plain files and has not been touched. You can open it in any
            editor whether or not this app runs.
          </p>
          <pre
            style={{
              margin: '0 0 20px',
              padding: '12px 14px',
              background: '#fff',
              border: '1px solid #ddd8d0',
              borderRadius: 9,
              font: '400 12.5px/1.6 ui-monospace, Menlo, monospace',
              whiteSpace: 'pre-wrap',
            }}
          >
            {error.message || 'No message was given.'}
          </pre>
          <button
            type="button"
            onClick={reset}
            style={{
              font: '500 13px/1 system-ui, sans-serif',
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #ccc6bd',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
