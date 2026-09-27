import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/react")({
  beforeLoad: () => {
    throw redirect({
      to: "/test/$sessionId",
      params: { sessionId: "demo" },
    });
  },
  component: () => null,
});
