-- Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — semeia a base
-- global de gabaritos (organizacao_id null, read-only para todas as orgs via
-- `gabarito_select_global_ou_propria_org`, supabase/migrations/
-- 20260727090200_gabarito.sql). A migration da Task 11.4
-- (20260727140100_fork_gabarito.sql) documentava essa base como VAZIA —
-- "população da base global fica pra quando o operador definir os módulos
-- padrão". Sem este seed, toda organização nova religada ao Supabase abriria
-- `/biblioteca` zerada: regressão real frente à experiência atual
-- (`lib/boxPresets.ts::seedPresetsPadrao()`, que semeia os mesmos 6 presets
-- no localStorage no primeiro acesso).
--
-- Os 6 `insert` abaixo são os mesmos 6 objetos `BoxModule` completos de
-- `lib/boxPresets.ts::presetsSeed()` (função privada do módulo, não
-- exportada) — GERADOS PROGRAMATICAMENTE, não retranscritos à mão: um script
-- Node temporário (`tsx`, apagado após o uso, nunca commitado) exportou
-- `presetsSeed` só durante a geração, chamou a função de verdade e fez
-- `JSON.stringify` de cada `box`, produzindo o jsonb exato abaixo — elimina o
-- risco de erro de transcrição num objeto aninhado grande (árvore
-- `BayNode`/`GrupoPortas`). `lib/boxPresets.ts` voltou ao estado original
-- (função privada de novo) logo em seguida — nenhuma mudança de app nesta
-- migration, só dado.
--
-- `origem_gabarito_id` null (não são fork de nada, são a origem). `id` interno
-- de cada `box` json fica "seed" (irrelevante — o identificador real é a
-- coluna `id` da linha, gerada por `gen_random_uuid()`).
insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
values (null, null, 'Balcão 2 Portas', 'Cozinha', $gab${"id":"seed","nome":"Balcão 2 Portas","tipo":"inferior","largura":800,"altura":720,"profundidade":550,"caixa":{"cor":"Branco TX","espessura":15},"temFundo":true,"puxador":"haste","raiz":{"id":"raiz-1","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"vazio"},"prateleiras":{"qtd":1,"recuo":20}}},"portas":[{"id":"seed-porta-1","alvo":{"tipo":"vaos","vaoIds":["raiz-1"]},"tipoAbertura":"abrir","sentido":"direita","qtd":2,"material":{"cor":"Louro Freijó","espessura":18}}]}$gab$::jsonb);

insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
values (null, null, 'Gaveteiro 4 Gavetas', 'Cozinha', $gab${"id":"seed","nome":"Gaveteiro 4 Gavetas","tipo":"inferior","largura":450,"altura":720,"profundidade":550,"caixa":{"cor":"Branco TX","espessura":15},"temFundo":false,"puxador":"haste","raiz":{"id":"raiz-2","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"gaveta","qtd":4,"profundidade":500,"interna":false,"corFrente":"Louro Freijó","espessuraFrente":18}}},"portas":[]}$gab$::jsonb);

insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
values (null, null, 'Aéreo 2 Portas', 'Cozinha', $gab${"id":"seed","nome":"Aéreo 2 Portas","tipo":"aereo","largura":800,"altura":700,"profundidade":350,"caixa":{"cor":"Branco TX","espessura":15},"temFundo":true,"puxador":"haste","raiz":{"id":"raiz-3","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"vazio"},"prateleiras":{"qtd":1,"recuo":20}}},"portas":[{"id":"seed-porta-2","alvo":{"tipo":"vaos","vaoIds":["raiz-3"]},"tipoAbertura":"abrir","sentido":"direita","qtd":2,"material":{"cor":"Louro Freijó","espessura":18}}]}$gab$::jsonb);

insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
values (null, null, 'Torre Quente Basculante + Portas', 'Cozinha', $gab${"id":"seed","nome":"Torre Quente Basculante + Portas","tipo":"torre","largura":700,"altura":2200,"profundidade":600,"caixa":{"cor":"Branco TX","espessura":15},"temFundo":true,"puxador":"haste","raiz":{"id":"raiz-4","split":"horizontal","qtdDivisorias":1,"recuoFrontal":20,"posicao":"centralizado","children":[{"id":"raiz-4-a","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"vazio"}}},{"id":"raiz-4-b","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"vazio"},"prateleiras":{"qtd":2,"recuo":20}}}]},"portas":[{"id":"seed-porta-3","alvo":{"tipo":"vaos","vaoIds":["raiz-4-a"]},"tipoAbertura":"abrir","sentido":"basculante_pia","qtd":1,"material":{"cor":"Louro Freijó","espessura":18}},{"id":"seed-porta-4","alvo":{"tipo":"vaos","vaoIds":["raiz-4-b"]},"tipoAbertura":"abrir","sentido":"direita","qtd":2,"material":{"cor":"Louro Freijó","espessura":18}}]}$gab$::jsonb);

insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
values (null, null, 'Guarda-roupa 2 Portas', 'Quarto', $gab${"id":"seed","nome":"Guarda-roupa 2 Portas","tipo":"torre","largura":900,"altura":2400,"profundidade":600,"caixa":{"cor":"Branco TX","espessura":15},"temFundo":true,"puxador":"haste","raiz":{"id":"raiz-5","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"vazio"},"prateleiras":{"qtd":3,"recuo":20}}},"portas":[{"id":"seed-porta-5","alvo":{"tipo":"vaos","vaoIds":["raiz-5"]},"tipoAbertura":"abrir","sentido":"direita","qtd":2,"material":{"cor":"Branco TX","espessura":18}}]}$gab$::jsonb);

insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
values (null, null, 'Guarda-roupa Gaveteiro Interno', 'Quarto', $gab${"id":"seed","nome":"Guarda-roupa Gaveteiro Interno","tipo":"torre","largura":900,"altura":2400,"profundidade":600,"caixa":{"cor":"Branco TX","espessura":15},"temFundo":true,"puxador":"haste","raiz":{"id":"raiz-6","split":"horizontal","qtdDivisorias":1,"recuoFrontal":20,"posicao":"centralizado","children":[{"id":"raiz-6-a","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"vazio"},"prateleiras":{"qtd":2,"recuo":20}}},{"id":"raiz-6-b","split":"none","qtdDivisorias":0,"content":{"tipo":"espaco","frente":{"tipo":"gaveta","qtd":3,"profundidade":500,"interna":true}}}]},"portas":[{"id":"seed-porta-6","alvo":{"tipo":"vaos","vaoIds":["raiz-6-a"]},"tipoAbertura":"abrir","sentido":"direita","qtd":2,"material":{"cor":"Branco TX","espessura":18}}]}$gab$::jsonb);
