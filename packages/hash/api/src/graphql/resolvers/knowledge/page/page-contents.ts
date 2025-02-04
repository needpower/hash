import { ApolloError } from "apollo-server-errors";
import { PageModel } from "../../../../model";
import { ResolverFn } from "../../../apiTypes.gen";
import { LoggedInGraphQLContext } from "../../../context";
import {
  mapBlockModelToGQL,
  UnresolvedPersistedEntityGQL,
  UnresolvedPersistedPageGQL,
} from "../model-mapping";

export const persistedPageContents: ResolverFn<
  Promise<UnresolvedPersistedEntityGQL[]>,
  UnresolvedPersistedPageGQL,
  LoggedInGraphQLContext,
  {}
> = async ({ entityId }, _, { dataSources }) => {
  const { graphApi } = dataSources;
  const page = await PageModel.getPageById(graphApi, { entityId });

  if (!page) {
    throw new ApolloError(
      `Page with entityId ${entityId} not found`,
      "NOT_FOUND",
    );
  }

  const blocks = await page.getBlocks(graphApi);

  return blocks.map((block) => mapBlockModelToGQL(block));
};
