import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

const loaded = new WeakMap<Loader, LazyExoticComponent<ComponentType>>();

export function lazyComponent(load: Loader): LazyExoticComponent<ComponentType> {
  const cached = loaded.get(load);
  if (cached) return cached;
  const component = lazy(load);
  loaded.set(load, component);
  return component;
}
