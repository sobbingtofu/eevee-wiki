interface LoaderProps {
  sizeType?: "default" | "small";
}

export const Loader = ({sizeType = "default"}: LoaderProps) => {
  return (
    <div
      className={`animate-spin rounded-full ${
        sizeType === "small" ? "h-4 w-4 border-b-2" : "h-6 w-6 border-b-5"
      } border-emerald-500`}
    ></div>
  );
};
