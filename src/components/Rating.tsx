import { saveRatedStory, getRatedStory } from '@src/utils/functions';
import React, { useState } from 'react';


interface RatingProps {
  totalStars?: number; // Número total de estrellas
  initialRating?: number; // Calificación inicial
  size?: number; // Tamaño de las estrellas (en píxeles)
  color?: string; // Color de las estrellas seleccionadas
  ratingCount?: number; // Número de calificaciones
  slug: string; // Slug de la historia
  className?: string; // Clases adicionales
}

const Rating: React.FC<RatingProps> = ({
  totalStars = 5,
  initialRating = 0,
  size = 24,
  color = '#FFD700',
  ratingCount = 0,
  slug,
  className = '',
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [_ratingCount, setRatingCount] = useState<number>(ratingCount);
  const [updatedInitialRating, setUpdatedInitialRating] = useState<number>(initialRating);

  // Manejar el cambio de rating
  const handleRating = async (value: number) => {
    const isRated = await getRatedStory(slug);
    debugger
    const result = await fetch(`/api/update-rating?slug=${slug}&rating=${value}&isRated=${!!isRated}`);
    if (result.status === 200) {
      const response = await result.json()
      debugger
      setRatingCount(response.results.ratingCount);
      const newRating = response.results.rating;
      if (newRating) {
        setUpdatedInitialRating(newRating);
      }
      saveRatedStory(slug, value);
    }
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <span className='text-xs'>({(Math.ceil(updatedInitialRating * 100) / 100).toFixed(2)})</span>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <span
            key={index}
            onClick={() => handleRating(starValue)}
            onMouseEnter={() => setRating(starValue)}
            onMouseLeave={() => setRating(updatedInitialRating)}
            className="cursor-pointer transition-colors"
            style={{
              fontSize: `${size}px`,
              color: starValue <= rating ? color : '#e0e0e0',
            }}
          >
            ★
          </span>
        );
      })}
      {_ratingCount > 0 && <span className='text-xs'>({_ratingCount} valoraciones)</span>}
    </div>
  );
};

export default Rating;
