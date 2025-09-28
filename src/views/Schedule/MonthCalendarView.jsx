import React, { useMemo } from 'react';
import { toYYYYMMDD } from '../../utils/helpers';
import { weekDayNames } from '../../utils/constants';

const MonthCalendarView = ({ currentDate, recurringSchedule, oneOffSchedule }) => {
    const stringToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };

    const monthGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        
        const grid = [];
        let dateIterator = new Date(firstDayOfMonth);
        let dayOfWeek = dateIterator.getDay(); // Sunday = 0, Monday = 1, ...
        let diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday should be 0, Sunday should be 6
        dateIterator.setDate(dateIterator.getDate() - diff);

        for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
            grid.push(new Date(dateIterator));
            dateIterator.setDate(dateIterator.getDate() + 1);
        }
        return grid;
    }, [currentDate]);

    return (
        <div>
            <div className="grid grid-cols-7 text-center font-semibold text-gray-500 text-sm border-b border-l border-r">
                {weekDayNames.map(day => <div className="py-2 border-t" key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 border-l border-gray-200 h-[60vh] overflow-auto">
                {monthGrid.map((day, index) => {
                    const dateString = toYYYYMMDD(day);
                    let dayOfWeek = day.getDay();
                    if (dayOfWeek === 0) dayOfWeek = 7;

                    const recurringEvents = recurringSchedule.filter(entry => 
                         entry.daysOfWeek.includes(String(dayOfWeek)) && (!entry.expiryDate || day <= new Date(entry.expiryDate + 'T23:59:59'))
                    );
                    const oneOffEvents = oneOffSchedule.filter(entry => entry.date === dateString);
                    const allEvents = [...recurringEvents, ...oneOffEvents].sort((a,b) => a.startTime.localeCompare(b.startTime));

                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = toYYYYMMDD(day) === toYYYYMMDD(new Date());

                    return (
                        <div key={index} className={`p-1 border-r border-b border-gray-200 flex flex-col ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}>
                           <span className={`self-start px-2 py-0.5 rounded-full text-sm ${isToday ? 'bg-blue-600 text-white' : ''} ${!isCurrentMonth ? 'text-gray-400' : ''}`}>
                                {day.getDate()}
                           </span>
                           <div className="flex-grow overflow-y-auto mt-1 space-y-1">
                                {allEvents.map(event => (
                                    <div key={event.id}
                                         className="text-white text-xs p-1 rounded truncate"
                                         style={{ backgroundColor: stringToColor(event.schoolName) }}
                                         title={`${event.schoolName} - ${event.className} (${event.startTime})`}
                                    >
                                        {event.schoolName}
                                    </div>
                                ))}
                           </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthCalendarView;

