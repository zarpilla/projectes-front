<template>
    <div class="container">
        <div class="columns is-hidden-mobile">
            <div class="column has-text-left"><a v-on:click="previous()"><i class="fa button is-primary fa-chevron-left"></i></a></div>
            <div class="row has-text-centered"><h2 class="title is-2">{{currentMonth.format("DD MMMM YYYY")}}-{{currentMonth.add(6, 'days').format("DD MMMM YYYY")}}</h2></div>
            <div class="column has-text-right"><a v-on:click="next()"><i class="fa button is-primary fa-chevron-right"></i></a></div>
        </div>

        <div class="rows is-hidden-tablet">
            <div class="row has-text-centered"><a v-on:click="previous()"><i class="button is-primary is-fullwidth fa fa-chevron-up"></i></a></div>
            <hr/>
            <div class="row has-text-centered"><h2 class="title is-2">{{currentMonth.format("DD MMMM YYYY")}}-{{currentMonth.add(6, 'days').format("DD MMMM YYYY")}}</h2></div>
            <hr/>
            <div class="row has-text-centered"><a v-on:click="next()"><i class="button is-primary is-fullwidth fa fa-chevron-down"></i></a></div>
        </div>

        <div class="tile is-ancestor">
            <div v-for="(weekday, i) in weekdays" :key="i" class="tile card is-vertical is-hidden-mobile">
                <header class="card-header">
                    <p class="card-header-title">
                        {{weekday}}
                    </p>
                </header>
            </div>
        </div>
 {{ dates }}
        <calendar-date :dates="dates" :events="events" :offset="0"></calendar-date>
        <!-- <calendar-date :dates="dates" :events="events" :offset="7"></calendar-date>
        <calendar-date :dates="dates" :events="events" :offset="14"></calendar-date>
        <calendar-date :dates="dates" :events="events" :offset="21"></calendar-date>
        <calendar-date :dates="dates" :events="events" :offset="28"></calendar-date> -->
    </div>
</template>

<script>
    import moment from 'moment';
    import CalendarDate from "./week-calendar-date.vue"

    const now = new moment(new Date().setDate(1));

    function getEmptyDate() {
        return { date: null, class: "is-hidden-mobile disabled" };
    }

    function getDates(start) {
        const days = Array.apply(null, { length: 7 })
            .map(Number.call, Number)
            .map(function (i) {
                const d = start.clone().add(i, "days");
                return { date: d.format("Do"), key: d.format("YYYY-MM-DD") };
            });

        var dates = new Array(start.day()).fill(getEmptyDate()).concat(days);
        var length = dates.length;
        dates.length = 7;
        dates.fill(getEmptyDate(), length);

        return dates;
    }

    export default {
        props: ["events"],
        data() {
            return {
                showDates: true,
                currentMonth: now,
                dates: getDates(now),
                weekdays: [
                    "dl.", "dt.", "dc.", "dj.", "dv.", "ds.", "dg."
                ]
            }
        },
        methods: {
            previous: function (offset) {
                console.log('previous')
                this.currentMonth.subtract(1, "weeks");
                this.dates = getDates(this.currentMonth);
                this.$emit('previous');
            },
            next: function (offset) {
                console.log('next')
                this.currentMonth.add(1, "weeks");
                this.dates = getDates(this.currentMonth);
                this.$emit('next');
            }
        },
        components: {
            'calendar-date': CalendarDate
        }
    }
</script>