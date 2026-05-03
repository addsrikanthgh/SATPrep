-- AP CSP module schema (snake_case only)
-- This script adds AP CSP tables and does not modify SAT Verbal tables.

create table if not exists csp_question (
  id text primary key,
  unit text not null,
  stem text not null,
  choices jsonb not null,
  correct_answer_index integer not null,
  explanation text not null,
  difficulty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint csp_question_correct_answer_index_check check (correct_answer_index >= 0),
  constraint csp_question_difficulty_check check (
    difficulty is null or difficulty in ('easy', 'medium', 'hard')
  )
);

create index if not exists csp_question_unit_idx on csp_question(unit);

create table if not exists csp_quiz_session (
  id bigserial primary key,
  user_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer not null default 0,
  total_questions integer not null,
  unit_filter text,
  immediate_feedback boolean not null default true,
  time_limit_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint csp_quiz_session_total_questions_check check (total_questions > 0),
  constraint csp_quiz_session_score_check check (score >= 0),
  constraint csp_quiz_session_time_limit_check check (
    time_limit_seconds is null or time_limit_seconds > 0
  ),
  constraint csp_quiz_session_user_id_fkey
    foreign key (user_id) references "user"(id) on delete cascade
);

create index if not exists csp_quiz_session_user_started_idx
  on csp_quiz_session(user_id, started_at desc);

create table if not exists csp_question_attempt (
  id bigserial primary key,
  session_id bigint not null,
  question_id text not null,
  selected_answer integer not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  constraint csp_question_attempt_session_question_unique unique (session_id, question_id),
  constraint csp_question_attempt_selected_answer_check check (selected_answer >= 0),
  constraint csp_question_attempt_session_id_fkey
    foreign key (session_id) references csp_quiz_session(id) on delete cascade,
  constraint csp_question_attempt_question_id_fkey
    foreign key (question_id) references csp_question(id) on delete cascade
);

create index if not exists csp_question_attempt_session_id_idx on csp_question_attempt(session_id);
create index if not exists csp_question_attempt_question_id_idx on csp_question_attempt(question_id);
