"use client";

import Image from "next/image";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";

function TopNaviBar() {
  const pathname = usePathname();
  const router = useRouter();

  const getNavClassName = (isActive: boolean) =>
    `transition-colors cursor-pointer ${isActive ? "text-primary1 font-bold " : "text-gray-400 hover:text-textWhite font-semibold"}`;

  const handleNavBtnClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="w-full h-16 bg-background absolute border border-b border-[#1e293b] flex items-center justify-between px-8">
      {/* 로고, 타이틀 */}
      <Link href="/search-learning-pokemons" className="w-fit h-fit">
        <div className="flex justify-start items-center gap-4">
          {/* 로고 */}
          <div className="w-10 h-10 relative ">
            <Image src="/icon/eevee01.png" alt="logo" fill className="object-cover" sizes="40px" priority />
          </div>

          {/* 텍스트 */}
          <h1 className="text-xl font-bold tracking-tight text-textWhite mt-1">이브이 위키</h1>
        </div>
      </Link>
      {/* 네비게이션 메뉴 */}
      <div className="flex justify-end items-center gap-8 text-sm">
        <button
          className={getNavClassName(pathname.startsWith("/search-learning-pokemons"))}
          onClick={() => handleNavBtnClick("/search-learning-pokemons")}
        >
          기술을 배우는 포켓몬
        </button>
        <button className={getNavClassName(pathname.startsWith("/moves"))} onClick={() => handleNavBtnClick("/moves")}>
          기술
        </button>
        <button
          className={getNavClassName(pathname.startsWith("/pokemons"))}
          onClick={() => handleNavBtnClick("/pokemons")}
        >
          포켓몬
        </button>
      </div>
    </div>
  );
}

export default TopNaviBar;
