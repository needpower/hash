import { UserInputError } from "apollo-server-errors";
import { GraphApi } from "@hashintel/hash-graph-client";
import produce from "immer";

import { BlockModel, EntityModel, UserModel } from "../../../../model";
import {
  CreatePersistedEntityAction,
  PersistedEntityDefinition,
  InsertPersistedBlockAction,
  SwapPersistedBlockDataAction,
  UpdatePersistedEntityAction,
  UpdatePersistedPageAction,
} from "../../../apiTypes.gen";

export const createEntityWithPlaceholdersFn =
  (graphApi: GraphApi, placeholderResults: PlaceholderResultsMap) =>
  async (
    originalDefinition: PersistedEntityDefinition,
    entityActorId: string,
  ) => {
    const entityDefinition = produce(originalDefinition, (draft) => {
      if (draft.existingEntity) {
        draft.existingEntity.entityId = placeholderResults.get(
          draft.existingEntity.entityId,
        );
      }
      if (draft.entityType?.entityTypeId) {
        draft.entityType.entityTypeId = placeholderResults.get(
          draft.entityType.entityTypeId,
        );
      }
    });

    if (entityDefinition.existingEntity) {
      return await EntityModel.getOrCreate(graphApi, {
        ownedById: entityActorId,
        entityDefinition,
        actorId: entityActorId,
      });
    } else {
      return await EntityModel.createEntityWithLinks(graphApi, {
        ownedById: entityActorId,
        entityTypeId: entityDefinition.entityType?.entityTypeId!,
        properties: entityDefinition.entityProperties,
        linkedEntities: entityDefinition.linkedEntities ?? undefined,
        actorId: entityActorId,
      });
    }
  };

type UpdatePageActionKey = keyof UpdatePersistedPageAction;

/**
 * @optimization instead of iterating the actions list on every call, we can
 *   memoize a hashmap of grouped actions so we only have to pass through the
 *   list once.
 *   Do note that we would likely have very small `actions` lists, so each
 *   iteration is very cheap.
 */
export const filterForAction = <T extends UpdatePageActionKey>(
  actions: UpdatePersistedPageAction[],
  key: T,
): { action: NonNullable<UpdatePersistedPageAction[T]>; index: number }[] =>
  actions.reduce<
    { action: NonNullable<UpdatePersistedPageAction[T]>; index: number }[]
  >((acc, current, index) => {
    if (current != null && key in current) {
      acc.push({ action: current[key]!, index });
    }
    return acc;
  }, []);

const isPlaceholderId = (value: unknown): value is `placeholder-${string}` =>
  typeof value === "string" && value.startsWith("placeholder-");

export class PlaceholderResultsMap {
  private map = new Map<string, string>();

  get(placeholderId: string) {
    if (isPlaceholderId(placeholderId)) {
      const entityId = this.map.get(placeholderId);
      if (!entityId) {
        throw new Error(`Placeholder ${placeholderId} missing`);
      }
      return entityId;
    }
    return placeholderId;
  }

  has(placeholderId: string): boolean {
    return this.map.has(placeholderId);
  }

  set(placeholderId: string | null | undefined, entity: { entityId: string }) {
    if (isPlaceholderId(placeholderId)) {
      this.map.set(placeholderId, entity.entityId);
    }
  }

  getResults() {
    return Array.from(this.map.entries()).map(([placeholderId, entityId]) => ({
      placeholderId,
      entityId,
    }));
  }
}

/**
 * Create new entity.
 * Acts on {@link CreatePersistedEntityAction}
 */
export const handleCreateNewEntity = async (params: {
  createEntityAction: CreatePersistedEntityAction;
  index: number;
  placeholderResults: PlaceholderResultsMap;
  createEntityWithPlaceholders: (
    originalDefinition: PersistedEntityDefinition,
    entityActorId: string,
  ) => Promise<EntityModel>;
}): Promise<void> => {
  try {
    const {
      createEntityAction: {
        entity: entityDefinition,
        ownedById: entityOwnedById,
        entityPlaceholderId,
      },
      createEntityWithPlaceholders,
      placeholderResults,
    } = params;
    placeholderResults.set(
      entityPlaceholderId,
      await createEntityWithPlaceholders(entityDefinition, entityOwnedById),
    );
  } catch (error) {
    if (error instanceof UserInputError) {
      throw new UserInputError(`action ${params.index}: ${error}`);
    }
    throw new Error(
      `createEntity: Could not create new entity: ${JSON.stringify(error)}`,
    );
  }
};

/**
 * Insert new block onto page.
 * Acts on {@link InsertPersistedBlockAction}
 */
export const handleInsertNewBlock = async (
  graphApi: GraphApi,
  params: {
    userModel: UserModel;
    insertBlockAction: InsertPersistedBlockAction;
    index: number;
    createEntityWithPlaceholders: (
      originalDefinition: PersistedEntityDefinition,
      entityActorId: string,
    ) => Promise<EntityModel>;
    placeholderResults: PlaceholderResultsMap;
  },
): Promise<BlockModel> => {
  try {
    const {
      userModel,
      insertBlockAction: {
        ownedById: blockOwnedById,
        componentId: blockComponentId,
        existingBlockEntity,
        blockPlaceholderId,
        entityPlaceholderId,
        entity,
      },
      createEntityWithPlaceholders,
      placeholderResults,
    } = params;

    const blockData = await createEntityWithPlaceholders(
      entity,
      // assume that the "block entity" is in the same account as the block itself
      blockOwnedById,
    );

    placeholderResults.set(entityPlaceholderId, blockData);

    let block: BlockModel;

    if (existingBlockEntity) {
      if (blockComponentId) {
        throw new Error(
          "InsertNewBlock: cannot set component id when using existing block entity",
        );
      }
      const existingBlock = await BlockModel.getBlockById(
        graphApi,
        existingBlockEntity,
      );

      if (!existingBlock) {
        throw new Error("InsertBlock: provided block id does not exist");
      }

      block = existingBlock;
    } else if (blockComponentId) {
      block = await BlockModel.createBlock(graphApi, {
        blockData,
        ownedById: userModel.entityId,
        componentId: blockComponentId,
        actorId: userModel.entityId,
      });
    } else {
      throw new Error(
        `InsertBlock: exactly one of existingBlockEntity or componentId must be provided`,
      );
    }

    placeholderResults.set(blockPlaceholderId, block);

    return block;
  } catch (error) {
    if (error instanceof UserInputError) {
      throw new UserInputError(`action ${params.index}: ${error}`);
    }
    throw new Error(
      `insertBlock: Could not create insert new or existing block: ${JSON.stringify(
        error,
      )}`,
    );
  }
};

/**
 * Swap a block's data entity to another entity.
 * Acts on {@link SwapPersistedBlockDataAction}
 */
export const handleSwapBlockData = async (
  graphApi: GraphApi,
  params: {
    userModel: UserModel;
    swapBlockDataAction: SwapPersistedBlockDataAction;
  },
): Promise<void> => {
  const {
    swapBlockDataAction: { entityId },
    userModel,
  } = params;

  const block = await BlockModel.getBlockById(graphApi, {
    entityId,
  });

  if (!block) {
    throw new Error(`Block with entityId ${entityId} not found`);
  }

  const { newEntityEntityId } = params.swapBlockDataAction;

  const newBlockDataEntity = await EntityModel.getLatest(graphApi, {
    entityId: newEntityEntityId,
  });

  await block.updateBlockDataEntity(graphApi, {
    newBlockDataEntity,
    actorId: userModel.entityId,
  });
};

/**
 * Update properties of an entity.
 * Acts on {@link UpdatePersistedEntityAction}
 */
export const handleUpdateEntity = async (
  graphApi: GraphApi,
  params: {
    userModel: UserModel;
    action: UpdatePersistedEntityAction;
    placeholderResults: PlaceholderResultsMap;
  },
): Promise<void> => {
  const { action, placeholderResults, userModel } = params;

  // If this entity ID is a placeholder, use that instead.
  let entityId = action.entityId;
  if (placeholderResults.has(entityId)) {
    entityId = placeholderResults.get(entityId);
  }

  const entityModel = await EntityModel.getLatest(graphApi, {
    entityId,
  });

  await entityModel.updateProperties(graphApi, {
    updatedProperties: Object.entries(action.properties).map(
      ([key, value]) => ({ propertyTypeBaseUri: key, value }),
    ),
    actorId: userModel.entityId,
  });
};
