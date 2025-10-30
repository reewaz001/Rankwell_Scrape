/**
 * Paper.club Categories (Thematiques) Configuration
 *
 * List of all thematic categories available in Paper.club
 */

export interface Category {
  id: string;
  name: string;
}

export const PAPERCLUB_CATEGORIES: Category[] = [
  { id: '4DPZZQt60rXRwkaFls6VLf', name: 'Animaux' },
  { id: '2ENZZUiWjqBEiKCbDUfZjV', name: 'Auto & Moto' },
  { id: '5IYySaNM9xO7zCFeOjgmnE', name: 'BTP & Industrie' },
  { id: 'Ozpfdv1YRbB9hURJZD9cx', name: 'Business & Entreprise' },
  { id: '79RlEg1w9S2gtbePAEGOME', name: 'Culture & Art' },
  { id: '25HZcHlC8R87PQJTM9Nn4D', name: 'Ecologie & Environnement' },
  { id: 'pMxgwxggfNt0YzE8xq97h', name: 'Economie & Société' },
  { id: 'a3up9hBkxvLrIKCqZcYr', name: 'Famille & Enfant' },
  { id: 'Ldq4776UG7sUwY3LbITbT', name: 'Finance & Banque' },
  { id: '4drjJp5z0vdheBu6BzqHjr', name: 'Formation & Emploi' },
  { id: '52XKP5ETB8KW39T7PUrgiU', name: 'Gaming & Jeux vidéo' },
  { id: '2Hv1kIZ13WoJJASZGGfFiW', name: 'Généraliste' },
  { id: '4MPMIR876Jzo7PZYov4uU2', name: 'High-Tech & Geek' },
  { id: '5sn2Bn22ZGvZPc5LYA3di4', name: 'Immobilier & Assurance' },
  { id: '20OAfJSmwCFhbVuQlAVvdt', name: 'Informatique' },
  { id: '1ZQKxyP9VDVQe7qwjtIh4z', name: 'Jeux d\'argent' },
  { id: '11zxtD5oxSNxYnWE5GRevP', name: 'Juridique & Droit' },
  { id: '5rmEUA4qdJiBpItcAMBPbC', name: 'Lifestyle & Vie pratique' },
  { id: '1QvKJQk3XTGmp6EJv5Euih', name: 'Loisirs & Divertissement' },
  { id: '73pJ8tMGUvIgv4OWfRHVC6', name: 'Maison & Jardin' },
  { id: 'pT9xY3z58nqx39RO0bru9', name: 'Mariage' },
  { id: '7xMqAG43K38cZYqGRYF0xC', name: 'Marketing & Communication' },
  { id: 'DC67FilsNujeYBtAwVl9H', name: 'Mode & Beauté' },
  { id: '553UTBorQce1yqRZ9MjVTo', name: 'Religion' },
  { id: '2rVqX8FmZGnW4KLpN3Y7sD', name: 'Rencontre' },
  { id: '3pzS9rnnM0YxEVlCRe9HRi', name: 'Santé & Bien-être' },
  { id: '4eO8FdZGKUr7Rq0PEEeYZ7', name: 'Sciences' },
  { id: '3Pbqm9xPhlaNTgT4UFX9MR', name: 'Sexe & Adulte' },
  { id: '7BWaUW2K8TgTVD4ZWnkvcx', name: 'Shopping & Promo' },
  { id: '68Nrsn2k1eloewB5LjUwpB', name: 'Sport' },
  { id: '3zxjjmSVyvWo0RLW1UphJp', name: 'Tourisme & Voyage' },
  { id: '5hWkhjggTdr3IOlRbQYACp', name: 'Transport' },
  { id: '3TauAx64ZLTuOFWoglrcIS', name: 'Voyance & Esotérisme' },
];

/**
 * Get category by ID
 */
export function getCategoryById(id: string): Category | undefined {
  return PAPERCLUB_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Get category by name
 */
export function getCategoryByName(name: string): Category | undefined {
  return PAPERCLUB_CATEGORIES.find(cat => cat.name === name);
}
