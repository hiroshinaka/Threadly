import React, {useState} from 'react';

export default function SearchBar({ onSearch }) {
    const [query, setQuery] = useState('');

    const handleChange = (e) => {
        setQuery(e.target.value);
        onSearch(e.target.value);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    return(
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={handleChange}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-full"
            />
        </form>
    )
}