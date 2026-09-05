import React from 'react';

const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[data-container-navigation="ignore"]'
].join(',');

export const isContainerNavigationClick = (event: React.MouseEvent<HTMLElement>) => {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const interactiveTarget = target.closest(INTERACTIVE_SELECTOR);
  return !interactiveTarget || interactiveTarget === event.currentTarget;
};

export const isContainerNavigationKey = (event: React.KeyboardEvent<HTMLElement>) =>
  event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ');
