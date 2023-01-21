import localForage from "localforage";
import esbuild from "esbuild-wasm";
import axios from "axios";

interface IContent {
  input?: string;
}

const localInstance = localForage.createInstance({
  name: "codePlay",
});

const buildMonitor = {
  start: {
    name: "Build Start",
    setup(build: esbuild.PluginBuild) {
      build.onStart(() => {
        console.log("Build Started");
      });
    },
  },
  end: {
    name: "Build End",
    setup(build: esbuild.PluginBuild) {
      build.onEnd((result) => {
        if (result.errors.length > 0) {
          console.log(`Build ended with ${result.errors.length} errors`);

          result.errors.forEach(({ location, notes, text, detail }, index) => {
            console.group(`Error ${index + 1}`);
            console.log("Text:", text);
            console.log("Location:", location);
            console.log("Notes:", notes);
            console.log("Detail:", detail);
            console.groupEnd();
          });
        }
      });
    },
  },
};

const resolvePathPlugin = {
  name: "resolve",
  setup(build: esbuild.PluginBuild) {
    build.onResolve({ filter: /(^index\.js*)/ }, () => {
      return {
        path: "index.js",
        namespace: "Root file",
      };
    });

    build.onResolve({ filter: /^\.+\// }, (args) => {
      return {
        namespace: "main",
        path: new URL(`${args.path}`, `https://unpkg.com${args.resolveDir}/`)
          .href,
      };
    });

    build.onResolve({ filter: /.*/ }, (args) => {
      return {
        namespace: "main",
        path: `https://unpkg.com/${args.path}`,
      };
    });
  },
};

const compilePathPlugin = (input: string) => {
  return {
    name: "compile",
    setup(build: esbuild.PluginBuild) {
      build.onLoad({ filter: /(^index\.js*)/ }, (args) => {
        return {
          contents: `
            ${input}
          `,
          loader: "jsx",
        };
      });

      build.onLoad({ filter: /.*/ }, async (args) => {
        const getPackage = await localInstance.getItem<esbuild.OnLoadResult>(
          args.path
        );

        if (getPackage) return getPackage;
        return null;
      });

      build.onLoad({ filter: /.css$/ }, async (args) => {
        const { data, request } = await axios.get(args.path);

        const escapedData = data
          .replace(/\n/g, "")
          .replace(/'/g, '\\"')
          .replace(/"/g, "\\'");

        const contents = `
          const style = document.createElement("style");
          style.innerText = ${escapedData}
          document.head.appendChild(style)
        f`;

        const responseObject: esbuild.OnLoadResult = {
          contents,
          loader: "jsx",
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        return responseObject;
      });

      build.onLoad({ filter: /.*/ }, async (args) => {
        const { data, request } = await axios.get(args.path);

        const responseObject: esbuild.OnLoadResult = {
          loader: "jsx",
          contents: data,
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        await localInstance.setItem<esbuild.OnLoadResult>(
          args.path,
          responseObject
        );

        return responseObject;
      });
    },
  };
};

const { start, end } = buildMonitor;

const aggregatePlugins = ({ input = "" }: IContent) => [
  start,
  resolvePathPlugin,
  compilePathPlugin(input),
  end,
];

export default aggregatePlugins;
