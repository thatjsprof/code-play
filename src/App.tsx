import "./App.css";
import React from "react";
import CodeCell from "./components/code-cell/code-cell.component";

function App() {
  return (
    <div className="App">
      <div style={{ display: "flex" }}>
        <CodeCell />
      </div>
    </div>
  );
}

export default App;
