
import { Agent } from './types';

export const AGENTS: Agent[] = [
  {
    id: 'abitur',
    name: 'AI-Abitur',
    fullName: 'Помощник абитуриента',
    description: 'Цифровой консультант для поступающих в Университет Болашак.',
    icon: 'fa-user-graduate',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    primaryFunc: 'Консультации по специальностям, перечню документов и условиям поступления в «Болашак».',
    instruction: 'Вы — AI-Abitur, официальный цифровой помощник приемной комиссии Кызылординского университета «Болашак». Помогайте абитуриентам.'
  },
  {
    id: 'kadr',
    name: 'KadrAI',
    fullName: 'HR и Документы',
    description: 'Единое окно выдачи справок и документов для студентов и сотрудников.',
    icon: 'fa-id-card',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    primaryFunc: 'Справки с места учебы, транскрипты, приказы и кадровые вопросы.',
    instruction: 'Вы — KadrAI, универсальный ассистент офиса регистратора и отдела кадров. Ваша задача — помогать студентам получать справки (о наличии места учебы, транскрипты, характеристики) и сотрудникам с их кадровыми документами.'
  },
  {
    id: 'nav',
    name: 'UniNav',
    fullName: 'Навигатор студента',
    description: 'Сопровождение по всем учебным процессам университета.',
    icon: 'fa-compass',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    primaryFunc: 'Расписание, академические вопросы, справки об обучении.',
    instruction: 'Вы — UniNav, проводник студента Университета Болашак.',
    minRole: 'STUDENT'
  },
  {
    id: 'career',
    name: 'CareerNavigator',
    fullName: 'Карьерный консультант',
    description: 'Помощь в трудоустройстве выпускников и студентов.',
    icon: 'fa-briefcase',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    primaryFunc: 'Поиск вакансий в Кызылорде, советы по резюме.',
    instruction: 'Вы — CareerNavigator, карьерный коуч Университета Болашак.'
  },
  {
    id: 'room',
    name: 'UniRoom',
    fullName: 'Помощник по общежитию',
    description: 'Решение бытовых и административных вопросов в Доме студентов.',
    icon: 'fa-hotel',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    primaryFunc: 'Заселение, заявки на ремонт, правила проживания.',
    instruction: 'Вы — UniRoom, цифровой помощник в общежитии.',
    minRole: 'STUDENT'
  }
];
