
import { Agent } from './types';

export const AGENTS: Agent[] = [
  {
    id: 'abitur',
    name: 'AI-Abitur',
    nameKey: 'agent.abitur.name',
    fullName: 'Помощник абитуриента',
    fullNameKey: 'agent.abitur.fullName',
    description: 'Цифровой консультант для поступающих в Университет Болашак.',
    descriptionKey: 'agent.abitur.description',
    icon: 'fa-user-graduate',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    primaryFunc: 'Консультации по специальностям, перечню документов и условиям поступления в «Болашак».',
    primaryFuncKey: 'agent.abitur.primaryFunc',
    instruction: 'Вы — AI-Abitur, официальный цифровой помощник приемной комиссии Кызылординского университета «Болашак». Помогайте абитуриентам.'
  },
  {
    id: 'kadr',
    name: 'KadrAI',
    nameKey: 'agent.kadr.name',
    fullName: 'HR и Документы',
    fullNameKey: 'agent.kadr.fullName',
    description: 'Единое окно выдачи справок и документов для студентов и сотрудников.',
    descriptionKey: 'agent.kadr.description',
    icon: 'fa-id-card',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    primaryFunc: 'Справки с места учебы, транскрипты, приказы и кадровые вопросы.',
    primaryFuncKey: 'agent.kadr.primaryFunc',
    instruction: 'Вы — KadrAI, универсальный ассистент офиса регистратора и отдела кадров. Ваша задача — помогать студентам получать справки (о наличии места учебы, транскрипты, характеристики) и сотрудникам с их кадровыми документами.'
  },
  {
    id: 'nav',
    name: 'UniNav',
    nameKey: 'agent.nav.name',
    fullName: 'Навигатор студента',
    fullNameKey: 'agent.nav.fullName',
    description: 'Сопровождение по всем учебным процессам университета.',
    descriptionKey: 'agent.nav.description',
    icon: 'fa-compass',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    primaryFunc: 'Расписание, академические вопросы, справки об обучении.',
    primaryFuncKey: 'agent.nav.primaryFunc',
    instruction: 'Вы — UniNav, проводник студента Кызылординского Университета Болашак.',
    minRole: 'STUDENT'
  },
  {
    id: 'career',
    name: 'CareerNavigator',
    nameKey: 'agent.career.name',
    fullName: 'Карьерный консультант',
    fullNameKey: 'agent.career.fullName',
    description: 'Помощь в трудоустройстве выпускников и студентов.',
    descriptionKey: 'agent.career.description',
    icon: 'fa-briefcase',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    primaryFunc: 'Поиск вакансий в Кызылорде, советы по резюме.',
    primaryFuncKey: 'agent.career.primaryFunc',
    instruction: 'Вы — CareerNavigator, карьерный коуч Университета Болашак.'
  },
  {
    id: 'room',
    name: 'UniRoom',
    nameKey: 'agent.room.name',
    fullName: 'Помощник по общежитию',
    fullNameKey: 'agent.room.fullName',
    description: 'Решение бытовых и административных вопросов в Доме студентов.',
    descriptionKey: 'agent.room.description',
    icon: 'fa-hotel',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    primaryFunc: 'Заселение, заявки на ремонт, правила проживания.',
    primaryFuncKey: 'agent.room.primaryFunc',
    instruction: 'Вы — UniRoom, цифровой помощник в общежитии.',
    minRole: 'STUDENT'
  }
];
