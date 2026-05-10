import {ComponentPropsWithoutRef} from "react";

type PlainCloseIconProps = ComponentPropsWithoutRef<"svg">;

export default function PlainCloseIcon(props: PlainCloseIconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M0.75 0.75L15.25 15.25M15.25 0.75L0.75 15.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="butt"
      />
    </svg>
  );
}
