import { useState, useEffect, useCallback } from 'react';

export const useSchedules = (currentUser, fetchApiData, log) => {
  const [recurringSchedule, setRecurringSchedule] = useState([]);
  const [oneOffSchedule, setOneOffSchedule] = useState([]);

  useEffect(() => {
    if (currentUser) {
      const fetchSchedules = async () => {
        try {
          const [recurringRes, oneOffRes] = await Promise.all([
            fetchApiData('/recurring-schedules', 'GET', null, currentUser.apiToken),
            fetchApiData('/one-off-schedules', 'GET', null, currentUser.apiToken)
          ]);
          setRecurringSchedule(recurringRes);
          setOneOffSchedule(oneOffRes.sort((a, b) => new Date(a.date) - new Date(b.date)));
          log('Tải dữ liệu lịch học thành công.', 'success');
        } catch (error) {
          log(`Lỗi tải lịch học: ${error.message}`, 'error');
        }
      };
      fetchSchedules();
    }
  }, [currentUser, log, fetchApiData]);

  return {
    recurringSchedule,
    setRecurringSchedule,
    oneOffSchedule,
    setOneOffSchedule
  };
};

