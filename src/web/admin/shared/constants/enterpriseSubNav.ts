/** Returns true when pathname matches itemPath and no sibling sub-nav path is a better match. */
export function isEnterpriseSubNavItemActive(
  pathname: string,
  itemPath: string,
  allPaths: string[],
): boolean {
  const matches = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  if (!matches(itemPath)) return false;
  return !allPaths.some((path) => path !== itemPath && path.length > itemPath.length && matches(path));
}
