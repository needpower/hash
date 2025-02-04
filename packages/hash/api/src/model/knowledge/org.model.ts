import { GraphApi } from "../../graph";
import {
  OrgModel,
  EntityModel,
  EntityModelCreateParams,
  AccountFields,
} from "..";
import { workspaceAccountId } from "../util";
import { WORKSPACE_TYPES } from "../../graph/workspace-types";

/**
 * @todo revisit organization size provided info. These constant strings could
 *   be replaced by ranges for example.
 *   https://app.asana.com/0/0/1202900021005257/f
 */
export enum OrgSize {
  ElevenToFifty = "ELEVEN_TO_FIFTY",
  FiftyOneToTwoHundredAndFifty = "FIFTY_ONE_TO_TWO_HUNDRED_AND_FIFTY",
  OneToTen = "ONE_TO_TEN",
  TwoHundredAndFiftyPlus = "TWO_HUNDRED_AND_FIFTY_PLUS",
}

export type OrgProvidedInfo = {
  orgSize: OrgSize;
};

export type OrgModelCreateParams = Omit<
  EntityModelCreateParams,
  "properties" | "entityTypeModel" | "ownedById"
> & {
  shortname: string;
  name: string;
  providedInfo?: OrgProvidedInfo;
};

/**
 * @class {@link OrgModel}
 */
export default class extends EntityModel {
  /**
   * Create a workspace organization entity.
   *
   * @param params.shortname - the shortname of the organization
   * @param params.name - the name of the organization
   * @param params.providedInfo - optional metadata about the organization
   *
   * @see {@link EntityModel.create} for the remaining params
   */
  static async createOrg(graphApi: GraphApi, params: OrgModelCreateParams) {
    const { shortname, name, providedInfo, actorId } = params;

    const { data: orgAccountId } = await graphApi.createAccountId();

    const properties: object = {
      [WORKSPACE_TYPES.propertyType.shortName.baseUri]: shortname,
      [WORKSPACE_TYPES.propertyType.orgName.baseUri]: name,
      [WORKSPACE_TYPES.propertyType.orgProvidedInfo.baseUri]: providedInfo
        ? {
            [WORKSPACE_TYPES.propertyType.orgSize.baseUri]:
              providedInfo.orgSize,
          }
        : undefined,
    };

    const entityTypeModel = WORKSPACE_TYPES.entityType.org;

    const entity = await EntityModel.create(graphApi, {
      ownedById: workspaceAccountId,
      properties,
      entityTypeModel,
      entityId: orgAccountId,
      actorId,
    });

    return OrgModel.fromEntityModel(entity);
  }

  static fromEntityModel(entity: EntityModel): OrgModel {
    if (
      entity.entityTypeModel.schema.$id !==
      WORKSPACE_TYPES.entityType.org.schema.$id
    ) {
      throw new Error(
        `Entity with id ${entity.entityId} is not a workspace org`,
      );
    }

    return new OrgModel(entity);
  }

  /**
   * Get a workspace organization entity by its entity id.
   *
   * @param params.entityId - the entity id of the organization
   */
  static async getOrgById(
    graphApi: GraphApi,
    params: { entityId: string },
  ): Promise<OrgModel> {
    const entity = await EntityModel.getLatest(graphApi, {
      entityId: params.entityId,
    });

    return OrgModel.fromEntityModel(entity);
  }

  /**
   * Get a workspace organization entity by its shortname.
   *
   * @param params.shortname - the shortname of the organization
   */
  static async getOrgByShortname(
    graphApi: GraphApi,
    params: { shortname: string },
  ): Promise<OrgModel | null> {
    /** @todo: use upcoming Graph API method to filter entities in the datastore */
    const orgEntities = await EntityModel.getByQuery(graphApi, {
      all: [
        { eq: [{ path: ["version"] }, { literal: "latest" }] },
        {
          eq: [
            { path: ["type", "versionedUri"] },
            { literal: WORKSPACE_TYPES.entityType.org.schema.$id },
          ],
        },
      ],
    });

    return (
      orgEntities
        .map(OrgModel.fromEntityModel)
        .find((org) => org.getShortname() === params.shortname) ?? null
    );
  }

  getShortname(): string {
    return (this.properties as any)[
      WORKSPACE_TYPES.propertyType.shortName.baseUri
    ];
  }

  /**
   * Update the shortname of an Organization
   *
   * @param params.updatedShortname - the new shortname to assign to the Organization
   * @param params.actorId - the id of the account updating the shortname
   */
  async updateShortname(
    graphApi: GraphApi,
    params: { updatedShortname: string; actorId: string },
  ): Promise<OrgModel> {
    const { updatedShortname, actorId } = params;

    if (AccountFields.shortnameIsInvalid(updatedShortname)) {
      throw new Error(`The shortname "${updatedShortname}" is invalid`);
    }

    if (
      AccountFields.shortnameIsRestricted(updatedShortname) ||
      (await AccountFields.shortnameIsTaken(graphApi, {
        shortname: updatedShortname,
      }))
    ) {
      throw new Error(
        `A user entity with shortname "${updatedShortname}" already exists.`,
      );
    }

    return await this.updateProperty(graphApi, {
      propertyTypeBaseUri: WORKSPACE_TYPES.propertyType.shortName.baseUri,
      value: updatedShortname,
      actorId,
    }).then((updatedEntity) => new OrgModel(updatedEntity));
  }

  getOrgName(): string {
    return (this.properties as any)[
      WORKSPACE_TYPES.propertyType.orgName.baseUri
    ];
  }

  static orgNameIsInvalid(preferredName: string) {
    return preferredName === "";
  }

  /**
   * Update the name of an Organization
   *
   * @param params.updatedOrgName - the new name to assign to the Organization
   * @param params.actorId - the id of the account updating the name
   */
  async updateOrgName(
    graphApi: GraphApi,
    params: { updatedOrgName: string; actorId: string },
  ) {
    const { updatedOrgName, actorId } = params;

    if (OrgModel.orgNameIsInvalid(updatedOrgName)) {
      throw new Error(`Organization name "${updatedOrgName}" is invalid.`);
    }

    const updatedEntity = await this.updateProperty(graphApi, {
      propertyTypeBaseUri: WORKSPACE_TYPES.propertyType.orgName.baseUri,
      value: updatedOrgName,
      actorId,
    });

    return OrgModel.fromEntityModel(updatedEntity);
  }
}
