// taken from prisma schema as mapped enum types on Prisma is not generated
// correctly on prisma client
// see https://github.com/prisma/prisma/issues/8446
// TODO: remove this when prisma client is fixed
export enum ReviewReactionType {
  LIKE = "💜",
  THANKFUL = "🙏",
  SLAY = "💅",
  FUNNY = "🤣",
  CRYING = "😭",
  SHOCKED = "😦",
}
