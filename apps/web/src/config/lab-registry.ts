export interface LabDefinition {
  category: string;
  description: string;
  difficulty: 'advanced' | 'expert';
  route: string;
  slug: string;
  status: 'planned' | 'building' | 'ready';
  title: string;
}

export const LAB_REGISTRY: readonly LabDefinition[] = [];
