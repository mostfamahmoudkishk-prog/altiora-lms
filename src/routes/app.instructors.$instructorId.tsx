import { createFileRoute } from "@tanstack/react-router";
import { TeacherProfilePublic } from "./teacher-profile.$teacherId";

export const Route = createFileRoute("/app/instructors/$instructorId")({
  component: InstructorProfileAlias,
});

function InstructorProfileAlias() {
  return <TeacherProfilePublic />;
}
