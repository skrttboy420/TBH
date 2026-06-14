import { getFarmLoopSets } from "@/lib/data/queries";
import { PageHeader } from "@/components/common/page-header";
import { FarmLoopManager } from "@/components/farm-loops/farm-loop-manager";

export const dynamic = "force-dynamic";

export default async function FarmLoopsPage() {
  const sets = await getFarmLoopSets();
  return (
    <>
      <PageHeader
        title="ชุดฟาร์มลูป"
        description="บันทึกแผนวนลูปฟาร์ม ดูว่าวนถึงด่านไหนและไปกี่รอบแล้ว จะได้ไม่หลุดลูปเวลาปล่อยฟาร์มทิ้งไว้"
      />
      <FarmLoopManager sets={sets} />
    </>
  );
}
