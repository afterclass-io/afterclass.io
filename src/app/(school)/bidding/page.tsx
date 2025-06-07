import { api } from "@/common/tools/trpc/server";
import { SearchCmdk } from "@/modules/search/components/SearchCmdk";
import { UniversityAbbreviation } from "@prisma/client";

export default async function BiddingPage() {
  const result = await api.courses.getAllByUniAbbrv({
    universityAbbrv: UniversityAbbreviation.SMU,
  });
  console.log(result);

  return (
    <>
      <div className="text-xl font-bold md:text-3xl">
        Get your personalized Bidding Recommendations here
      </div>

      <div className="bg-card">
        <SearchCmdk />
        <div className="text-xl font-bold md:text-3xl">View Courses</div>
        <div>
          {result.map((course) => {
            return (
              <div key={course.id}>
                {course.code} {course.name}
              </div>
            );
          })}
        </div>
      </div>

      <div></div>

      <div>this will be the footder</div>
    </>
  );
}
