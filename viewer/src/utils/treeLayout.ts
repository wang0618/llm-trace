import type { Request } from '../types';

export interface RequestTreeNode {
  request: Request;
  children: RequestTreeNode[];
}

/**
 * Build a tree structure from flat requests with parent_id references.
 * Requests are sorted by timestamp within each level.
 */
export function buildRequestTree(requests: Request[]): RequestTreeNode[] {
  // Create a map for quick lookup
  const nodeMap = new Map<string, RequestTreeNode>();

  // Initialize nodes
  for (const request of requests) {
    nodeMap.set(request.id, { request, children: [] });
  }

  // Build parent-children relationships
  const roots: RequestTreeNode[] = [];

  for (const request of requests) {
    const node = nodeMap.get(request.id)!;

    if (request.parent_id === null) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(request.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    }
  }

  // Sort children by timestamp at each level
  const sortChildren = (node: RequestTreeNode) => {
    node.children.sort((a, b) => a.request.timestamp - b.request.timestamp);
    for (const child of node.children) {
      sortChildren(child);
    }
  };

  // Sort roots and their children
  roots.sort((a, b) => a.request.timestamp - b.request.timestamp);
  for (const root of roots) {
    sortChildren(root);
  }

  return roots;
}
