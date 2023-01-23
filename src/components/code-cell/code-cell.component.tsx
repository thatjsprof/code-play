import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import debounce from "lodash.debounce";
import * as esbuild from "esbuild-wasm";
import aggregatePlugins from "plugins/plugins";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import CodeBlock from "components/code-block/code-block.component";

const CodeCell = () => {
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const buildRef = useRef<boolean>(false);
  const mounted = useRef<boolean>(false);
  const editorRef = useRef(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleChange: OnChange = (value) => {
    setInput(() => value as string);
  };

  const debouncedResults = useMemo(() => {
    return debounce(handleChange, 300);
  }, []);

  const compileCode = useCallback(async () => {
    if (!buildRef.current) return;

    try {
      const result = await esbuild.build({
        bundle: true,
        write: false,
        sourcemap: true,
        entryPoints: ["index.js"],
        plugins: [...aggregatePlugins({ input })],
        define: {
          "process.env.NODE_ENV": '"development"',
          global: "window",
        },
        // target: ["chrome58", "firefox57", "safari11", "edge16"],
      });

      setCode(result.outputFiles[0].text);
      setError("");
    } catch (err: any) {
      setCode("");
      setError(err.message);
    }
  }, [input]);

  const startService = async () => {
    try {
      await esbuild.initialize({
        worker: true,
        wasmURL: "https://unpkg.com/esbuild-wasm@0.15.12/esbuild.wasm",
      });

      buildRef.current = true;
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!mounted.current) {
      startService();
    }

    mounted.current = true;
  }, []);

  useEffect(() => {
    compileCode();
  }, [compileCode]);

  useEffect(() => {
    return () => {
      debouncedResults.cancel();
    };
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <div
        style={{
          flex: 1,
          position: "relative",
        }}
      >
        <Editor
          width="100%"
          height="100%"
          theme="vs-dark"
          options={{
            fontSize: 16,
            wordWrap: "on",
            folding: false,
            showUnused: false,
            automaticLayout: true,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
          onChange={debouncedResults}
          defaultLanguage="javascript"
          onMount={handleEditorDidMount}
        />
      </div>
      <div
        style={{
          flex: 1,
        }}
      >
        <CodeBlock code={code} err={error} />
      </div>
    </div>
  );
};

export default CodeCell;
