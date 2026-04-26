import SearchInput from "@/components/common-ui/SearchInput/SearchInput";
import {createContext} from "vm";

function MoveSearchBucketSection() {
  const SelectedMoveContext = createContext([]);

  return (
    <div className="w-[380px] h-full p-6 bg-backgroundLight flex flex-col justify-start items-start">
      <h3 className="text-xs font-bold mb-4">기술 검색</h3>
      <SearchInput />
    </div>
  );
}

export default MoveSearchBucketSection;
