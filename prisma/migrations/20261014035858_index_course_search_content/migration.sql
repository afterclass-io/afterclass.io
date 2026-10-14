CREATE INDEX courses_area_trigram_count_idx ON public.courses USING btree (cardinality(show_trgm(COALESCE(course_area, ''::text))));

CREATE INDEX courses_description_trigram_count_idx ON public.courses USING btree (cardinality(show_trgm(COALESCE(description, ''::text))));

CREATE INDEX courses_search_content_fts_idx ON public.courses USING gin (to_tsvector('simple'::regconfig, ((((((code || ' '::text) || name) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(course_area, ''::text))));
