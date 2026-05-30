import { useGreeting } from "../query/queries";

export function ShowGreet() {
  const { data, isLoading, isError } = useGreeting();
  const message = data?.message ?? "";

  return (
    <>
      {isLoading ? <p>Loading...</p> : null}
      {isError ? <p>Failed to load greeting.</p> : null}
      <h1>{message}</h1>
    </>
  );
}
