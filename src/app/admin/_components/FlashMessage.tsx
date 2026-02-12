type FlashMessageProps = {
  type?: string;
  message?: string;
};

export function FlashMessage({ type, message }: FlashMessageProps) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

