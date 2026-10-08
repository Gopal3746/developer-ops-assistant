import { describe, expect, it } from "vitest";

import { needsIssueReclassification } from "../src/github/issue-content.js";

const classifiedContent = {
  title: "Synchronization failed",
  body: "The API returned an error.",
  labels: ["bug", "api"],
};

describe("GitHub issue classification freshness", () => {
  it("preserves a classification when content is unchanged", () => {
    expect(
      needsIssueReclassification(
        classifiedContent,
        {
          ...classifiedContent,
          labels: ["api", "bug"],
        },
      ),
    ).toBe(false);
  });

  it.each([
    {
      field: "title",
      incoming: {
        ...classifiedContent,
        title: "Synchronization times out",
      },
    },
    {
      field: "body",
      incoming: {
        ...classifiedContent,
        body: "The API request timed out.",
      },
    },
    {
      field: "labels",
      incoming: {
        ...classifiedContent,
        labels: ["bug", "urgent"],
      },
    },
  ])(
    "requeues an issue when its $field changes",
    ({ incoming }) => {
      expect(
        needsIssueReclassification(
          classifiedContent,
          incoming,
        ),
      ).toBe(true);
    },
  );
});
