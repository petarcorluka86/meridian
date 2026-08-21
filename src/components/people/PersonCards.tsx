/**
 * The four cards a Person page is made of, each in its own file. They share a
 * stylesheet and nothing else — About is a Markdown editor, Links is a list,
 * Plans is a form, and Compensation is a blurred table.
 */
export { AboutCard } from './AboutCard';
export { LinksCard, type LinkView } from './LinksCard';
export { PlansCard, type PlanView } from './PlansCard';
export { CompensationCard, type CompHistoryRow } from './CompensationCard';
