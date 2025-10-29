import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/common/components/card";
import {
    ClockIcon,
    GraduationCapColoredIcon,
    // Assuming these icons are custom components, keep them as is
} from "@/common/components/icons";


interface ModAlternativesCardProps {
    courseCode: string;

    professors: {
        name: string;
        slug: string;
    }[];

    sessions: {
        dayOfWeek: string | null;
        startTime: string | null;
        endTime: string | null;
        venue?: string | null;
    }[];
}

export function ModAlternativesCard({
    courseCode,
    professors,
    sessions
}: ModAlternativesCardProps) {

    // Helper to get unique session links (in case multiple sessions share the same time/day)
    const uniqueSessions = sessions.reduce((acc, session) => {
        // Ensure all components of the key exist before using them
        if (session.dayOfWeek && session.startTime && session.endTime) {
            const key = `${session.dayOfWeek}-${session.startTime}-${session.endTime}`;
            if (!acc.has(key)) {
                acc.set(key, session);
            }
        }
        return acc;
    }, new Map<string, typeof sessions[0]>());

    const uniqueSessionArray = Array.from(uniqueSessions.values());

    // Only render the card if there are professors OR sessions to show
    if (professors.length === 0 && uniqueSessionArray.length === 0) {
        return null;
    }

    return (
        <Card className="shadow-lg border-2">
            <CardHeader>
                <CardTitle className="text-xl">Explore Alternatives</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* === Column 1: Professor Alternatives === */}
                <div className="flex flex-col gap-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-100 pl-2">
                        {/* Added a title/header for the column */}
                        <span className="text-base font-medium">By Professor</span>
                    </h3>

                    {professors.map((prof) => {
                        const profLink = `/bidding?course=${courseCode}&prof=${prof.slug}`;
                        return (
                            // Link wrapper with the requested styles
                            <Link
                                key={prof.slug}
                                href={profLink}
                                className="block w-full p-3 rounded-md border hover:bg-secondary focus-ring bg-card transition-color"
                            >
                                <div className="flex items-center gap-2">
                                    <GraduationCapColoredIcon size={24} />
                                    <span className="w-full truncate tracking-tight text-sm font-medium">
                                        {prof?.name ?? "TBA"}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                    {professors.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No professors assigned.</p>
                    )}
                </div>

                {/* === Column 2: Time Slot Alternatives === */}
                <div className="flex flex-col gap-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-100 pl-2">
                        {/* Added a title/header for the column */}
                        <span className="text-base font-medium">By Time Slot</span>
                    </h3>

                    {uniqueSessionArray.map((session, index) => {
                        // Ensure required fields for the link are not null before rendering
                        if (!session.dayOfWeek || !session.startTime || !session.endTime) return null;

                        const timeLink = `/bidding?course=${courseCode}&day=${session.dayOfWeek}&start=${session.startTime}&end=${session.endTime}`;

                        return (
                            // Link wrapper with the requested styles
                            <Link
                                key={index}
                                href={timeLink}
                                className="block w-full p-3 rounded-md border hover:bg-secondary focus-ring  transition-color"
                            >
                                <div className="flex items-center gap-1">
                                    <ClockIcon size={16} className="mr-1" />
                                    <span className="max-w-16 truncatefont-medium">
                                        {session.dayOfWeek}
                                    </span>
                                    <span>
                                        {session.startTime}-{session.endTime}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                    {uniqueSessionArray.length === 0 && (
                        <p className=" text-gray-500 italic">No class timings assigned.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
