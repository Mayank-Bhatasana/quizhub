import { ShowGreet } from "./pages/showGreeting";
import "./index.css";
import Header from "./pages/Header.tsx";
import Form from "./pages/Form.tsx";
// import { useState } from 'react'
function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-4">
      <div className="w-full max-w-6xl">
        <Header />
        <ShowGreet />
        <Form />
      </div>
    </div>
  );
}
export default App;
