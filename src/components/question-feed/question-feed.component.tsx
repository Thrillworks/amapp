/** @jsx jsx */
import { css, jsx } from "@emotion/core";
import { FunctionComponent, useContext, useState } from "react";

import Question from "../question/question.component";
import { QuestionsContext } from "../../services/questions/questions.provider";
import { IQuestion } from "../../services/questions/questions.types";
import { sortByCreatedAt, sortByUpVotes } from "../../services/utilities";
import Button from "../ui/button/button.component";
import { AclActions } from "../../services/auth/auth.acl";
import Can from "../../hoc/can.component";

interface QuestionFeedProps {
  roomId: string;
}

const opposite = (order: "createdAt" | "upVotes") =>
  order === "createdAt" ? "upVotes" : "createdAt";

const sortToLabel = (order: "createdAt" | "upVotes") =>
  order === "createdAt" ? "Newest" : "Most Votes";

type FilterTypes = "answered" | "unanswered" | "approved" | "unapproved";

type Filter = {
  [key in FilterTypes]: (question: IQuestion) => boolean;
};

type AppliedFilters = {
  [key in FilterTypes]?: boolean;
};

type FiltersAcl = {
  [key in FilterTypes]?: AclActions;
};

const QUESTION_FILTERS: Filter = {
  answered: (question: IQuestion) => !!question.answered,
  unanswered: (question: IQuestion) => !question.answered,
  approved: (question: IQuestion) => !!question.approved,
  unapproved: (question: IQuestion) => !question.approved,
};

const filters: FilterTypes[] = [
  "answered",
  "unanswered",
  "approved",
  "unapproved",
];

const filtersAcl: FiltersAcl = {
  approved: AclActions.APPROVE_QUESTION,
  unapproved: AclActions.APPROVE_QUESTION,
};

const QuestionFeed: FunctionComponent<QuestionFeedProps> = ({ roomId }) => {
  const { questions } = useContext(QuestionsContext);
  const [orderBy, setOrderBy] = useState<"createdAt" | "upVotes">("upVotes");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    approved: true,
    // unanswered: true,
  });
  const toggleFilter = (filter: FilterTypes) => {
    // Disabling
    if (appliedFilters[filter]) {
      return setAppliedFilters((lastAppliedFilters) => {
        const newAppliedFilters = { ...lastAppliedFilters };
        delete newAppliedFilters[filter];
        return newAppliedFilters;
      });
    }
    // Enabling (Prevent both Answered and Unanswered from being true at the same time)
    if (filter === "answered" && appliedFilters["unanswered"]) {
      setAppliedFilters((lastAppliedFilters) => {
        const newFilters = { ...lastAppliedFilters, answered: true };
        delete newFilters.unanswered;
        return newFilters;
      });
    }
    if (filter === "unanswered" && appliedFilters["answered"]) {
      return setAppliedFilters((lastAppliedFilters) => {
        const newFilters = { ...lastAppliedFilters, unanswered: true };
        delete newFilters.answered;
        return newFilters;
      });
    }
    return setAppliedFilters((lastAppliedFilters) => ({
      ...lastAppliedFilters,
      [filter]: true,
    }));
  };

  // TODO: Add a filter/sorting SVG for the sorting
  return (
    <section
      css={css`
        margin-top: 1rem;
      `}
    >
      <h2>Question Feed</h2>
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          flex-direction: column;
          @media (min-width: 1020px) {
            flex-direction: row;
          }
        `}
      >
        <div>
          <span
            css={css`
              margin-right: 1rem;
            `}
          >
            Currently Sorted By: "{sortToLabel(orderBy)}"
          </span>
          <Button
            onClick={() => {
              setOrderBy(opposite(orderBy));
            }}
          >
            {orderBy === "upVotes" ? "Newest" : "Most Votes"}
          </Button>
        </div>
        <div>
          <span
            css={css`
              @media (min-width: 1020px) {
                margin-left: 1rem;
              }
              margin-right: 1rem;
            `}
          >
            Filters:
          </span>
          {filters.map((filter) =>
            filtersAcl[filter] !== undefined ? (
              <Can aclAction={filtersAcl[filter] as AclActions}>
                <Button
                  css={css`
                    text-transform: uppercase;
                    background-color: ${appliedFilters[filter]
                      ? "black"
                      : "lightgray"};
                    color: ${appliedFilters[filter] ? "lightgray" : "black"};
                  `}
                  onClick={() => toggleFilter(filter)}
                >
                  {filter}
                </Button>
              </Can>
            ) : (
              <Button
                css={css`
                  text-transform: uppercase;
                  background-color: ${appliedFilters[filter]
                    ? "black"
                    : "lightgray"};
                  color: ${appliedFilters[filter] ? "lightgray" : "black"};
                `}
                onClick={() => toggleFilter(filter)}
              >
                {filter}
              </Button>
            )
          )}
        </div>
      </div>

      {(questions as IQuestion[])
        .sort(orderBy === "upVotes" ? sortByUpVotes : sortByCreatedAt)
        .filter(
          (question) =>
            Object.keys(appliedFilters).length === 0 ||
            Object.entries(appliedFilters).every(
              ([filter, val]) =>
                val && QUESTION_FILTERS[filter as FilterTypes](question)
            )
        )
        .map((q) => (
          <Question key={q.id} roomId={roomId} question={q} />
        ))}
    </section>
  );
};

export default QuestionFeed;
