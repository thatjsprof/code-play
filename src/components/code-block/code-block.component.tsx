import React, { useRef, useEffect } from "react";

const html = `
    <html>
        <body>
            <div id="root"></div>
        </body>

        <script>
            function handleError (err) {
                const rootElement = document.getElementById("root")
                rootElement.innerHTML = '<div style="color: red">Runtime Error' + err + '</div>'
                console.error(err)
            }

            window.addEventListener('message', evaluateCode)

            window.addEventListener('error', function (event) {
                event.preventDefault()
            })

            function evaluateCode (event) {
                try {
                    eval(event.data)
                } catch (err) {
                    handleError(err)
                }
            }
        </script>
    </html>
`;

const CodeBlock = ({ code, err }: { code: string; err: string }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = html;
    }

    setTimeout(() => {
      iframeRef.current &&
        iframeRef.current.contentWindow?.postMessage(code, "*");
    }, 20);
  }, [code, iframeRef]);

  return (
    <>
      <iframe
        width="99.5%"
        height="80%"
        ref={iframeRef}
        id="code_iframe"
        title="Code Execution"
        sandbox="allow-scripts"
      />
      <div style={{ height: "19%", backgroundColor: "#f2f2f2" }}>
        {err && <p>{err}</p>}
      </div>
    </>
  );
};

export default CodeBlock;
