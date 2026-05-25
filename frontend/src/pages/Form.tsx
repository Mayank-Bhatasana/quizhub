import { useState } from "react";

export default function Form() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const res = await fetch("http://localhost:3000/sendForm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        username,
        phone,
      }),
    });
    const data = await res.json();
    console.log(data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={"flex justify-center align-middle items-center w-full"}
    >
      <div className="main--form flex flex-col justify-center *:gap-6 *:flex">
        <div id="email">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
        </div>
        <div id="pass">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <div id="username">
          <label htmlFor="username">Username</label>
          <input
            type="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </div>
        <div id="phoneNumber">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
