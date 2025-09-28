import React, { useState, useEffect, useCallback } from 'react';
import { toYYYYMMDD } from '../../utils/helpers';
import { dayOfWeekMap, dayOfWeekFullNameMap } from '../../utils/constants';

const WeekCalendarView = ({ currentDate, recurringSchedule, oneOffSchedule, handleEditClick, handleDeleteRecurring, handleDeleteOneOff, setTooltip }) => {
    const [weekDates, setWeekDates] = useState([]);
    const [currentTimePosition, setCurrentTimePosition] = useState(0);

    const CALENDAR_START_HOUR = 6;
    const CALENDAR_END_HOUR = 18;
    const HOUR_HEIGHT = 60;

    const timeToY = useCallback((timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const totalMinutesFromStart = (hours - CALENDAR_START_HOUR) * 60 + minutes;
        return (totalMinutesFromStart / 60) * HOUR_HEIGHT;
    }, [CALENDAR_START_HOUR, HOUR_HEIGHT]);

    const durationToHeight = useCallback((startStr, endStr) => {
        if (!startStr || !endStr) return 0;
        const [startHours, startMinutes] = startStr.split(':').map(Number);
        const [endHours, endMinutes] = endStr.split(':').map(Number);
        const durationInMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        return (durationInMinutes / 60) * HOUR_HEIGHT;
    }, [HOUR_HEIGHT]);
    
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

    useEffect(() => {
        const startOfWeek = new Date(currentDate);
        const day = currentDate.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startOfWeek.setDate(currentDate.getDate() - diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const dates = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });
        setWeekDates(dates);
    }, [currentDate]);

     useEffect(() => {
        const updateCurrentTime = () => {
            setCurrentTimePosition(timeToY(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })));
        };
        updateCurrentTime();
        const interval = setInterval(updateCurrentTime, 60000);
        return () => clearInterval(interval);
    }, [timeToY]);

    const handleMouseEnter = (e, entry) => {
        const tooltipContent = (
            <div className="w-48">
                <p className="font-bold text-base">{entry.schoolName}</p>
                <p className="text-sm">{entry.className}</p>
                <hr className="my-1 border-gray-400"/>
                <p><strong>Thời gian:</strong> {entry.startTime} - {entry.endTime}</p>
                {entry.date && <p><strong>Ngày:</strong> {new Date(entry.date + 'T00:00:00').toLocaleDateString('vi-VN')}</p>}
                {entry.daysOfWeek && entry.daysOfWeek.length > 0 && <p><strong>Thứ:</strong> {entry.daysOfWeek.map(d => dayOfWeekMap[d]).join(', ')}</p>}
                {entry.expiryDate && <p><strong>Hết hạn:</strong> {new Date(entry.expiryDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>}
            </div>
        );
        setTooltip({ visible: true, content: tooltipContent, x: e.pageX + 15, y: e.pageY + 15 });
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
        <>
            {/* HEADER */}
            <div className="flex">
                <div className="w-16 flex-shrink-0 bg-gray-100 border-b-2 border-r border-gray-200" />
                <div className="flex-1 grid grid-cols-7 text-center font-semibold text-gray-600">
                    {weekDates.map(date => (
                        <div key={date.toISOString()} className="bg-gray-100 p-2 border-b-2 border-gray-200">
                            <p className="text-xs">{dayOfWeekFullNameMap[date.getDay() === 0 ? '7' : String(date.getDay())]}</p>
                            <p className={`text-lg font-bold ${toYYYYMMDD(date) === toYYYYMMDD(new Date()) ? 'text-blue-600' : ''}`}>
                                {date.getDate()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* BODY */}
            <div className="relative flex" style={{ height: `${(CALENDAR_END_HOUR - CALENDAR_START_HOUR) * HOUR_HEIGHT}px` }}>
                <div className="w-16 flex-shrink-0 pr-2 text-right text-sm text-gray-500 bg-gray-100 border-r border-gray-200">
                    {Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }).map((_, i) => (
                        <div key={i} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                            <span className="absolute -top-2.5 right-2">{`${CALENDAR_START_HOUR + i}:00`}</span>
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 bg-gray-50">
                    {weekDates.map(date => {
                         const dateString = toYYYYMMDD(date);
                         let dayOfWeek = date.getDay();
                         if (dayOfWeek === 0) dayOfWeek = 7;
                         const recurringEvents = recurringSchedule.filter(entry => 
                             entry.daysOfWeek.includes(String(dayOfWeek)) && (!entry.expiryDate || date <= new Date(entry.expiryDate + 'T23:59:59'))
                         );
                         const oneOffEvents = oneOffSchedule.filter(entry => entry.date === dateString);
                         const allEvents = [...recurringEvents, ...oneOffEvents];
                         return(
                            <div key={date.toISOString()} className="relative border-l border-gray-200">
                                 {Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }).map((_, i) => (
                                     <div key={i} className="border-b border-dashed border-gray-200" style={{ height: `${HOUR_HEIGHT}px` }}></div>
                                 ))}
                                 {allEvents.map(entry => (
                                     <div key={entry.id}
                                         onClick={() => handleEditClick(entry, entry.date ? 'one-off' : 'recurring')}
                                         onMouseEnter={(e) => handleMouseEnter(e, entry)}
                                         onMouseLeave={handleMouseLeave}
                                         className="absolute left-1 right-1 p-1 rounded-lg text-white text-xs z-10 overflow-hidden cursor-pointer shadow-lg hover:opacity-80 transition-opacity"
                                         style={{
                                             top: `${timeToY(entry.startTime)}px`,
                                             height: `${durationToHeight(entry.startTime, entry.endTime)}px`,
                                             backgroundColor: stringToColor(entry.schoolName),
                                         }}
                                     >
                                         <p className="font-bold">{entry.schoolName}</p>
                                         <p>{entry.className}</p>
                                         <p className="text-xs opacity-80">{entry.startTime} - {entry.endTime}</p>
                                           <button onClick={(e) => { e.stopPropagation(); entry.date ? handleDeleteOneOff(entry.id) : handleDeleteRecurring(entry.id); }}
                                            className="absolute bottom-1 right-1 bg-red-800 bg-opacity-50 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
                                            >
                                                &times;
                                            </button>
                                     </div>
                                 ))}
                            </div>
                         )
                    })}
                </div>

                <div className="absolute left-16 right-0 h-0.5 bg-red-500 z-20" style={{ top: `${currentTimePosition}px`}}>
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                </div>
            </div>
        </>
    );
};

export default WeekCalendarView;

