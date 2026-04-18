export const formatDate = (dateInput: any): string => {
  if (!dateInput) return "Date indisponible";

  let date: Date;

  // 1. Gérer Firestore Timestamp
  if (dateInput.toDate && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } 
  // 2. Gérer les timestamps Firebase (objets {seconds, nanoseconds})
  else if (dateInput.seconds) {
    date = new Date(dateInput.seconds * 1000);
  }
  // 3. Gérer les Strings ou Date objects
  else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return "Date indisponible";

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};
