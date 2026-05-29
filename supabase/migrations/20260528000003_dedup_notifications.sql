delete from notifications
where id in (
  select id from (
    select id, row_number() over (
      partition by user_id, title order by created_at desc
    ) as rn
    from notifications
    where title in ('Pending Transactions', 'Low Stock Alert')
  ) dup
  where dup.rn > 1
);
