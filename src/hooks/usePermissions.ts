import { useAuth } from '@/contexts/AuthContext';

const ROLE_ACCESS: Record<string, string[]> = {
  admin:      ['home', 'ocorrencias', 'kanbans', 'livro', 'analise'],
  supervisor: ['home', 'ocorrencias', 'kanbans', 'livro', 'analise'],
  rh:         ['home', 'ocorrencias', 'analise'],
  enfermagem: ['home', 'ocorrencias', 'analise'],
  user:       ['home', 'ocorrencias', 'analise'],
  developer:  ['home', 'ocorrencias', 'kanbans', 'livro', 'analise', 'developer'],
};

export function usePermissions() {
  const { role, isAdmin } = useAuth();

  const isDeveloper  = role === 'developer';
  const isSupervisor = role === 'supervisor';
  const isRh         = role === 'rh';
  const isEnfermagem = role === 'enfermagem';

  const _canCreate = isAdmin || isSupervisor || isRh || isEnfermagem || role === 'user';
  const _canEdit   = isAdmin || isSupervisor || isRh || isEnfermagem;
  const _canDelete = isAdmin || isSupervisor;

  function canAccess(module: string): boolean {
    if (!role) return false;
    if (isDeveloper) return true;
    const roleModules = ROLE_ACCESS[role] || [];
    return roleModules.includes(module);
  }

  function canCreate(_module: string): boolean { return _canCreate; }
  function canEdit(_module: string): boolean   { return _canEdit; }
  function canDelete(_module: string): boolean  { return _canDelete; }

  return { canAccess, canCreate, canEdit, canDelete };
}
