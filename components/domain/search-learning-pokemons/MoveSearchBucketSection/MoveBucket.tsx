import {SampleSearchResultItem} from "@/components/common-ui/SearchInput/SearchInput";

interface MoveBucketProps {
  moveBucket: SampleSearchResultItem[];
}

function MoveBucket({moveBucket}: MoveBucketProps) {
  return (
    <div>
      {moveBucket.map((move, index) => (
        <div key={index}>
          <p>{move.korName}</p>
          <p>{move.damageClass}</p>
          <p>{move.type}</p>
        </div>
      ))}
    </div>
  );
}

export default MoveBucket;
