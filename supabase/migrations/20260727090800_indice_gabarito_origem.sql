-- Task 11.2 — get_advisors (performance) apontou FK sem índice de cobertura:
-- gabarito.origem_gabarito_id (linhagem do fork, D-15) referencia gabarito.id
-- mas não tinha índice próprio (só organizacao_id tinha). Sem isso, resolver
-- a linhagem de um fork (ou o ON DELETE SET NULL em cascata) faz seq scan.

create index gabarito_origem_gabarito_id_idx on public.gabarito (origem_gabarito_id);
