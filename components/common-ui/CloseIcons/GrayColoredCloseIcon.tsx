import Image from "next/image";
import {PropsWithChildren} from "react";
import CloseIconUrl from "@/public/icon/cancel-icon-silver.png";

interface CloseIconProps {
  onClick?: () => void;
}

export const GrayColoredCloseIcon = ({onClick}: PropsWithChildren<CloseIconProps>) => {
  return (
    <div className="select-none cursor-pointer" onClick={onClick}>
      <Image src={CloseIconUrl} alt="CloseIcon" width={20} height={20} />
    </div>
  );
};
